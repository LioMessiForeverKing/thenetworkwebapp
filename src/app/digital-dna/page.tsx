'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Menu from '@/components/Menu';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import styles from './page.module.css';

// Dynamic import for 3D Graph (SSR disable is crucial)
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

export default function DigitalDnaPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
    const [isLoadingGraph, setIsLoadingGraph] = useState(true);
    const graphRef = useRef<any>(null);

    // Auth Redirect
    useEffect(() => {
        if (!loading && !user) router.push('/login');
    }, [user, loading, router]);

    // Fetch Data
    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setIsLoadingGraph(true);
            const supabase = createClient();
            
            // Try fetching with retries in case interests are still being generated
            let retries = 0;
            const maxRetries = 10;
            let interests: string[] = [];
            
            while (retries < maxRetries) {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('interests, full_name')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error fetching profile:', error);
                    break;
                }

                interests = (profile?.interests as string[]) || [];
                
                // If we have interests, break. Otherwise, wait and retry (in case they're being generated)
                if (interests.length > 0 || retries >= maxRetries - 1) {
                    break;
                }
                
                // Wait 2 seconds before retrying
                await new Promise(resolve => setTimeout(resolve, 2000));
                retries++;
            }

            // Construct Graph
            // Central Node: User
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .single();
                
            const nodes: any[] = [{ id: 'user', name: profile?.full_name || 'Me', val: 20, color: '#ffffff' }];
            const links: any[] = [];

            interests.forEach((interest, i) => {
                const id = `interest-${i}`;
                // Interest Nodes
                nodes.push({
                    id,
                    name: interest,
                    val: 10 + Math.random() * 10,
                    // Group by random for now or index based color
                    group: i
                });

                // Link to Center
                links.push({
                    source: 'user',
                    target: id
                });
            });

            // If empty
            if (interests.length === 0) {
                nodes.push({ id: 'empty', name: 'No Interests Yet', val: 5, color: '#888' });
                links.push({ source: 'user', target: 'empty' });
            }

            setGraphData({ nodes, links });
            setIsLoadingGraph(false);
        };
        fetchData();
    }, [user]);

    if (loading || isLoadingGraph) {
        return (
            <div className={styles.wrapper} style={{ background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Menu />
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{
                        width: '48px',
                        height: '48px',
                        border: '3px solid rgba(0, 0, 0, 0.1)',
                        borderTopColor: '#000',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }}></div>
                    <p style={{ color: '#000', fontSize: '16px' }}>Loading your interest graph...</p>
                    <style jsx>{`
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.wrapper} style={{ background: '#ffffff' }}>
            <Menu />

            <div className={styles.overlay} style={{ pointerEvents: 'none', zIndex: 10 }}>
                <h1 className={styles.title} style={{ color: 'black', textShadow: '0 0 10px rgba(0,0,0,0.1)' }}>Interest Graph</h1>
            </div>

            <div style={{ width: '100vw', height: '100vh' }}>
                <ForceGraph3D
                    ref={graphRef}
                    graphData={graphData}
                    nodeLabel="name"
                    nodeAutoColorBy="group"
                    nodeResolution={16}
                    linkOpacity={0.2}
                    linkWidth={1}
                    linkColor={() => '#000000'}
                    backgroundColor="#ffffff"

                    // Add some motion or auto-rotate?
                    // enableNodeDrag={true} // Default true

                    // Simple custom node logic?
                    // Let's stick to default spheres first, they look good in 3D.
                    // Or maybe sprites for text?
                    // Default behavior: Hover shows text.
                    // User might want visible text.
                    // Let's rely on standard ForceGraph3D behavior first.
                    // "3d and so much better" -> usually means particle effects/motion.

                    onNodeClick={(node: any) => {
                        // Focus on node
                        const distance = 40;
                        const distRatio = 1 + distance / Math.hypot(node.x ?? 0, node.y ?? 0, node.z ?? 0);
                        graphRef.current?.cameraPosition(
                            { x: (node.x ?? 0) * distRatio, y: (node.y ?? 0) * distRatio, z: (node.z ?? 0) * distRatio }, // new position
                            node, // lookAt ({ x, y, z })
                            3000  // ms transition duration
                        );
                    }}
                />
            </div>
        </div>
    );
}
